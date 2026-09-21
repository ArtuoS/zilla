module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = authenticated_user
    end

    private

    def authenticated_user
      payload = JsonWebToken.decode(request.params[:token])
      user = payload && User.find_by(id: payload[:user_id])
      user || reject_unauthorized_connection
    end
  end
end
