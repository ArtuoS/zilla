class Permission < ApplicationRecord
  belongs_to :product
  belongs_to :user

  enum :access_level, { viewer: 0, admin: 1 }

  validates :user_id, uniqueness: { scope: :product_id }
  validate :user_is_not_the_product_owner

  private

  def user_is_not_the_product_owner
    return unless product && user_id == product.user_id

    errors.add(:user_id, "is already the product owner")
  end
end
