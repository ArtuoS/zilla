module ProjectScoped
  extend ActiveSupport::Concern

  private

  def reachable_projects
    Project.where(product: policy_scope(Product))
  end

  def find_project
    reachable_projects.find(params[:project_id])
  end
end
