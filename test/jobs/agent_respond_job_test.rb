require "test_helper"

class AgentRespondJobTest < ActiveJob::TestCase
  test "creates the agent's reply message and completes the stage" do
    project_stage = project_stages(:one_copywriting)
    project_stage.update!(status: :running)

    Agent::RespondToMessage.stub(:new, ->(*) { Struct.new(:call).new("A punchier reply.") }) do
      assert_difference "ProjectMessage.count", 1 do
        AgentRespondJob.perform_now(project_stage.id)
      end
    end

    reply = project_stage.project_messages.order(:created_at).last
    assert reply.agent_sender?
    assert_nil reply.user_id
    assert_equal "A punchier reply.", reply.content

    project_stage.reload
    assert_equal "A punchier reply.", project_stage.output
    assert project_stage.completed?
  end
end
