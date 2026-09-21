class Api::V1::RegistrationsController < ApplicationController
  skip_before_action :authenticate_user!, only: :create

  def create
    user = User.new(user_params)
    if user.save
      render json: user.as_json(only: [ :id, :name, :surname, :email ]), status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :surname, :email, :password)
  end
end
