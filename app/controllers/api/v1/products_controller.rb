class Api::V1::ProductsController < ApplicationController
  def index
    products = policy_scope(Product).includes(:owner, :permissions)
    render json: products.map { |product| product_json(product) }
  end

  def show
    product = find_product
    render json: product_json(product)
  end

  def create
    product = current_user.owned_products.build(product_params)
    authorize product, :create?

    if product.save
      render json: product_json(product), status: :created
    else
      render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    product = find_product
    authorize product, :update?

    if product.update(product_params)
      render json: product_json(product)
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

  def product_json(product)
    product.as_json.merge(
      access_level: Pundit.policy(current_user, product).access_level,
      owner: product.owner.as_json(only: [ :id, :name, :surname, :email ])
    )
  end
end
