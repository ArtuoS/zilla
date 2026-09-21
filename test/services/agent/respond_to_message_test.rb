require "test_helper"

class Agent::RespondToMessageTest < ActiveSupport::TestCase
  class FakeOpenAiClient
    attr_reader :received_parameters

    def initialize(reply: "Stubbed agent reply")
      @reply = reply
    end

    def chat(parameters:)
      @received_parameters = parameters
      { "choices" => [ { "message" => { "content" => @reply } } ] }
    end
  end

  test "returns the reply text from the client's response" do
    fake_client = FakeOpenAiClient.new(reply: "Here is your revised copy.")
    reply = Agent::RespondToMessage.new(project_stages(:one_copywriting), client: fake_client).call
    assert_equal "Here is your revised copy.", reply
  end

  test "sends the stage's initial_prompt as system context plus the message history" do
    fake_client = FakeOpenAiClient.new
    Agent::RespondToMessage.new(project_stages(:one_copywriting), client: fake_client).call

    messages = fake_client.received_parameters[:messages]
    assert_equal "system", messages.first[:role]
    assert_equal stages(:copywriting).initial_prompt, messages.first[:content]
    assert(messages.any? { |m| m[:role] == "user" })
  end
end
