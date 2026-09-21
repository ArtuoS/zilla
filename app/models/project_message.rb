class ProjectMessage < ApplicationRecord
  belongs_to :project
  belongs_to :project_stage
  belongs_to :user, optional: true

  enum :sender_type, { user_sender: 0, agent_sender: 1 }

  validates :content, presence: true
  validates :user_id, presence: true, if: :user_sender?
  validates :user_id, absence: true, if: :agent_sender?
end
