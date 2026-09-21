module Authenticatable
  extend ActiveSupport::Concern

  included do
    attr_reader :current_user
    before_action :authenticate_user!
  end

  private

  def authenticate_user!
    token = request.headers["Authorization"]&.split(" ")&.last
    payload = token && JsonWebToken.decode(token)
    @current_user = payload && User.find_by(id: payload[:user_id])

    render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
  end
end
