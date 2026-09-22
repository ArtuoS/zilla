class Api::V1::MeController < ApplicationController
  def show
    render json: current_user.as_json(only: [ :id, :name, :surname, :email ])
  end
end
