class Product < ApplicationRecord
  belongs_to :owner, class_name: "User", foreign_key: :user_id, inverse_of: :owned_products

  has_many :stages, -> { order(:sequence_order) }, dependent: :destroy
  has_many :projects, dependent: :destroy
  has_many :permissions, dependent: :destroy
  has_many :shared_users, through: :permissions, source: :user

  validates :name, presence: true
end
