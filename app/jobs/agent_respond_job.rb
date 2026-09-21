class AgentRespondJob < ApplicationJob
  queue_as :default

  def perform(project_stage_id)
    project_stage = ProjectStage.find(project_stage_id)
    reply_text = Agent::RespondToMessage.new(project_stage).call

    reply = project_stage.project_messages.create!(
      project: project_stage.project,
      sender_type: :agent_sender,
      content: reply_text
    )

    project_stage.update!(output: reply_text, status: :completed, completed_at: Time.current)

    ProjectStageChannel.broadcast_to(project_stage, {
      type: "message_created",
      message: reply.as_json,
      project_stage: project_stage.as_json(only: [ :id, :status, :output ])
    })
  end
end
