class Api::V1::PermissionsController < ApplicationController
  include ProductScoped

  def index
    product = find_product
    authorize product, :view?
    render json: product.permissions.includes(:user)
  end

  def create
    product = find_product
    authorize product, :share?

    invitee = User.find_by("LOWER(email) = ?", params.dig(:permission, :email).to_s.downcase)
    unless invitee
      render json: { errors: [ "no user is registered with that email" ] }, status: :unprocessable_entity
      return
    end

    permission = product.permissions.find_or_initialize_by(user: invitee)
    permission.access_level = params.dig(:permission, :access_level)

    if permission.save
      render json: permission, status: (permission.previously_new_record? ? :created : :ok)
    else
      render json: { errors: permission.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    product = find_product
    authorize product, :share?
    permission = product.permissions.find(params[:id])

    if permission.update(access_level: params.dig(:permission, :access_level))
      render json: permission
    else
      render json: { errors: permission.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    product = find_product
    authorize product, :share?
    permission = product.permissions.find(params[:id])
    permission.destroy!
    head :ok
  end
end
