module Agent
  class RespondToMessage
    def initialize(project_stage, client: OpenAI::Client.new(access_token: ENV.fetch("OPENAI_API_KEY", nil)))
      @project_stage = project_stage
      @client = client
    end

    def call
      response = @client.chat(parameters: {
        model: ENV.fetch("OPENAI_MODEL", "gpt-4o-mini"),
        messages: messages
      })
      response.dig("choices", 0, "message", "content")
    end

    private

    def messages
      [ { role: "system", content: @project_stage.stage.initial_prompt } ] + history
    end

    def history
      @project_stage.project_messages.order(:created_at).map do |message|
        { role: message.user_sender? ? "user" : "assistant", content: message.content }
      end
    end
  end
end
