class Api::V1::ProjectMessagesController < ApplicationController
  include ProjectScoped

  def index
    project_stage = find_project_stage
    authorize project_stage.project.product, :view?
    messages = project_stage.project_messages.includes(:user).order(:created_at)
    render json: messages.map { |message| message_json(message) }
  end

  def create
    project_stage = find_project_stage
    authorize project_stage.project.product, :post_message?

    message = project_stage.project_messages.build(
      project: project_stage.project,
      sender_type: :user_sender,
      user: current_user,
      content: message_params[:content]
    )

    if message.save
      project_stage.update!(status: :running) unless project_stage.running?
      AgentRespondJob.perform_later(project_stage.id)
      render json: message_json(message), status: :created
    else
      render json: { errors: message.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def find_project_stage
    project = find_project
    project.project_stages.find(params[:project_stage_id])
  end

  def message_params
    params.require(:project_message).permit(:content)
  end

  def message_json(message)
    message.as_json(except: [ :user_id ]).merge(
      user: message.user&.as_json(only: [ :id, :name, :surname ])
    )
  end
end
