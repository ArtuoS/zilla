class Api::V1::ProductsController < ApplicationController
  def index
    render json: policy_scope(Product)
  end

  def show
    product = find_product
    render json: product
  end

  def create
    product = current_user.owned_products.build(product_params)
    authorize product, :create?

    if product.save
      render json: product, status: :created
    else
      render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    product = find_product
    authorize product, :update?

    if product.update(product_params)
      render json: product
    else
      render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    product = find_product
    authorize product, :destroy?
    product.destroy!
    head :ok
  end

  private

  def find_product
    policy_scope(Product).find(params[:id])
  end

  def product_params
    params.require(:product).permit(:name, :description)
  end
end
