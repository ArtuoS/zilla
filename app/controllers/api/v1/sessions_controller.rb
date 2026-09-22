class Api::V1::SessionsController < ApplicationController
  skip_before_action :authenticate_user!, only: :create

  def create
    user = User.find_by("LOWER(email) = ?", params[:email].to_s.downcase)

    if user&.authenticate(params[:password])
      token = JsonWebToken.encode({ user_id: user.id })
      render json: { token: token, user: user.as_json(only: [ :id, :name, :surname, :email ]) }, status: :ok
    else
      render json: { error: "Invalid email or password" }, status: :unauthorized
    end
  end

  def destroy
    # Stateless JWT: nothing to invalidate server-side, the client discards the token.
    head :ok
  end
end
