class Stage < ApplicationRecord
  belongs_to :product

  has_many :project_stages, dependent: :restrict_with_error

  validates :name, :initial_prompt, presence: true
  validates :sequence_order, presence: true,
    uniqueness: { scope: :product_id }
end
