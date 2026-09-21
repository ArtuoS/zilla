class ApplicationController < ActionController::API
  include Authenticatable
  include Pundit::Authorization

  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from Pundit::NotAuthorizedError, with: :render_forbidden

  private

  # A product/project/stage a user has no access to at all (not owner, not
  # shared) is looked up through a Pundit policy_scope, so it never resolves
  # and falls in here as a plain not-found — indistinguishable from a resource
  # that doesn't exist (NFR-3).
  def render_not_found
    render json: { error: "Not found" }, status: :not_found
  end

  # A resource the user CAN see (it's in their policy_scope, e.g. as a viewer)
  # but isn't allowed to act on renders 403 instead — existence isn't a secret
  # to someone who already has some access to it.
  def render_forbidden
    render json: { error: "Forbidden" }, status: :forbidden
  end
end
