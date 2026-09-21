require "test_helper"

class ProductBuilderFlowTest < ActionDispatch::IntegrationTest
  test "register, build a product with stages, run two independent projects, chat, and share" do
    # Register
    post api_v1_registrations_path, params: {
      user: { name: "Flow", surname: "User", email: "flow@example.com", password: "password123" }
    }
    assert_response :created

    # Login
    post api_v1_session_path, params: { email: "flow@example.com", password: "password123" }
    assert_response :success
    token = JSON.parse(response.body)["token"]
    headers = { "Authorization" => "Bearer #{token}" }

    # Create product
    post api_v1_products_path, params: { product: { name: "Flow Product" } }, headers: headers
    assert_response :created
    product_id = JSON.parse(response.body)["id"]

    # Add stages
    post api_v1_product_stages_path(product_id),
      params: { stage: { name: "Copy", initial_prompt: "Write copy." } }, headers: headers
    assert_response :created
    stage_one_id = JSON.parse(response.body)["id"]

    post api_v1_product_stages_path(product_id),
      params: { stage: { name: "Landing Page", initial_prompt: "Build a landing page." } }, headers: headers
    assert_response :created

    # Two independent projects (Scenario 6/7)
    post api_v1_product_projects_path(product_id), headers: headers
    assert_response :created
    project_a_id = JSON.parse(response.body)["id"]

    post api_v1_product_projects_path(product_id), headers: headers
    assert_response :created
    project_b_id = JSON.parse(response.body)["id"]

    assert_not_equal project_a_id, project_b_id

    # Chat on project A's first stage (Scenario 8)
    get api_v1_project_project_stages_path(project_a_id), headers: headers
    project_a_stage_one_id = JSON.parse(response.body).find { |ps| ps["stage_id"] == stage_one_id }["id"]

    assert_enqueued_with(job: AgentRespondJob) do
      post api_v1_project_project_stage_messages_path(project_a_id, project_a_stage_one_id),
        params: { project_message: { content: "Make it about hot flashes specifically." } }, headers: headers
    end
    assert_response :created

    # Project B is untouched (Scenario 7)
    get api_v1_project_project_stages_path(project_b_id), headers: headers
    assert(JSON.parse(response.body).all? { |ps| ps["status"] == "pending" })

    # Share with a second, already-registered user (Scenario 10)
    post api_v1_registrations_path, params: {
      user: { name: "Second", surname: "User", email: "second@example.com", password: "password123" }
    }
    assert_response :created

    post api_v1_product_permissions_path(product_id),
      params: { permission: { email: "second@example.com", access_level: "viewer" } }, headers: headers
    assert_response :created

    post api_v1_session_path, params: { email: "second@example.com", password: "password123" }
    second_token = JSON.parse(response.body)["token"]
    second_headers = { "Authorization" => "Bearer #{second_token}" }

    # Viewer can see the product but not create a stage (Scenario 12)
    get api_v1_product_path(product_id), headers: second_headers
    assert_response :success

    post api_v1_product_stages_path(product_id),
      params: { stage: { name: "Extra", initial_prompt: "x" } }, headers: second_headers
    assert_response :forbidden
  end
end
