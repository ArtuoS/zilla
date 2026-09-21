class Api::V1::ProjectsController < ApplicationController
  include ProjectScoped
  include ProductScoped

  def index
    product = find_product
    authorize product, :view?
    render json: product.projects
  end

  def create
    product = find_product
    authorize product, :create_project?

    if product.stages.none?
      render json: { errors: [ "product must have at least one stage before a project can be created" ] },
        status: :unprocessable_entity
      return
    end

    project = product.projects.build
    ActiveRecord::Base.transaction do
      project.save!
      product.stages.find_each { |stage| project.project_stages.create!(stage: stage) }
    end

    render json: project_json(project), status: :created
  end

  def show
    project = reachable_projects.find(params[:id])
    render json: project_json(project)
  end

  private

  def project_json(project)
    project.as_json.merge(
      project_stages: project.project_stages.joins(:stage).order("stages.sequence_order").map { |ps|
        ps.as_json(only: [ :id, :stage_id, :status, :output, :started_at, :completed_at ])
      }
    )
  end
end
