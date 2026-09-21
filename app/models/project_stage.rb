class ProjectStage < ApplicationRecord
  belongs_to :project
  belongs_to :stage

  has_many :project_messages, dependent: :destroy

  enum :status, { pending: 0, running: 1, completed: 2, skipped: 3 }

  validates :stage_id, uniqueness: { scope: :project_id }
end
