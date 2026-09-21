class Project < ApplicationRecord
  belongs_to :product

  has_many :project_stages, dependent: :destroy
  has_many :project_messages, through: :project_stages
end
