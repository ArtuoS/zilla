class ProductPolicy < ApplicationPolicy
  def show?
    owner? || permission.present?
  end
  alias_method :view?, :show?

  def create?
    true
  end

  def update?
    owner_or_admin?
  end
  alias_method :manage_stages?, :update?
  alias_method :create_project?, :update?
  alias_method :share?, :update?
  alias_method :post_message?, :update?
  alias_method :transition_stage?, :update?

  def destroy?
    owner?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.left_joins(:permissions)
        .where("products.user_id = :user_id OR permissions.user_id = :user_id", user_id: user.id)
        .distinct
    end
  end

  private

  def owner?
    record.user_id == user.id
  end

  def permission
    @permission ||= record.permissions.find_by(user_id: user.id)
  end

  def owner_or_admin?
    owner? || permission&.admin?
  end
end
