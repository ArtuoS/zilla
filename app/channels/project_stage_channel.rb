class ProjectStageChannel < ApplicationCable::Channel
  def subscribed
    project_stage = ProjectStage.find(params[:project_stage_id])
    reject unless Pundit.policy(current_user, project_stage.project.product).view?

    stream_for project_stage
  end
end
