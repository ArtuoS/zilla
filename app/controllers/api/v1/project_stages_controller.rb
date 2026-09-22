class Api::V1::ProjectStagesController < ApplicationController
  include ProjectScoped

  def index
    project = find_project
    authorize project.product, :view?
    project_stages = project.project_stages.includes(:stage).joins(:stage).order("stages.sequence_order")
    render json: project_stages.map { |ps| project_stage_json(ps) }
  end

  def show
    project_stage = find_project_stage
    render json: project_stage_json(project_stage)
  end

  def skip
    project_stage = find_project_stage
    authorize project_stage.project.product, :transition_stage?
    project_stage.update!(status: :skipped)
    render json: project_stage_json(project_stage)
  end

  def force_advance
    project_stage = find_project_stage
    authorize project_stage.project.product, :transition_stage?
    project_stage.update!(status: :completed, completed_at: Time.current)
    render json: project_stage_json(project_stage)
  end

  def redo
    project_stage = find_project_stage
    authorize project_stage.project.product, :transition_stage?
    project_stage.update!(status: :running)
    AgentRespondJob.perform_later(project_stage.id)
    render json: project_stage_json(project_stage)
  end

  private

  def find_project_stage
    project = find_project
    authorize project.product, :view?
    project.project_stages.find(params[:id])
  end

  def project_stage_json(project_stage)
    project_stage.as_json.merge(
      stage: project_stage.stage.as_json(only: [ :id, :name, :description, :initial_prompt, :sequence_order ])
    )
  end
end
