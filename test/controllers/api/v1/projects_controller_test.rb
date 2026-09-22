require "test_helper"

class Api::V1::ProjectsControllerTest < ActionDispatch::IntegrationTest
  test "creates a project and one pending project_stage per existing stage (FR-6, FR-8, Scenario 6)" do
    assert_difference "Project.count", 1 do
      post api_v1_product_projects_path(products(:menopause_guide)), headers: auth_headers(users(:alice))
    end
    assert_response :created

    project = Project.order(:created_at).last
    assert_equal products(:menopause_guide).stages.count, project.project_stages.count
    assert(project.project_stages.all?(&:pending?))
  end

  test "rejects creating a project for a product with zero stages (FR-9)" do
    assert_no_difference "Project.count" do
      post api_v1_product_projects_path(products(:empty_product)), headers: auth_headers(users(:alice))
    end
    assert_response :unprocessable_entity
  end

  test "there is no limit on how many projects a product can have (FR-19)" do
    3.times do
      post api_v1_product_projects_path(products(:menopause_guide)), headers: auth_headers(users(:alice))
      assert_response :created
    end
  end

  test "two projects for the same product track progress independently (FR-7, Scenario 7)" do
    one = projects(:alice_project_one)
    two = projects(:alice_project_two)

    get api_v1_project_path(one), headers: auth_headers(users(:alice))
    one_body = JSON.parse(response.body)

    get api_v1_project_path(two), headers: auth_headers(users(:alice))
    two_body = JSON.parse(response.body)

    assert_not_equal one_body["project_stages"], two_body["project_stages"]
  end

  test "each project_stage nests its stage's id, name, and sequence_order (FR-9)" do
    get api_v1_project_path(projects(:alice_project_one)), headers: auth_headers(users(:alice))
    body = JSON.parse(response.body)
    copywriting_entry = body["project_stages"].find { |ps| ps["stage_id"] == stages(:copywriting).id }

    assert_equal stages(:copywriting).id, copywriting_entry["stage"]["id"]
    assert_equal stages(:copywriting).name, copywriting_entry["stage"]["name"]
    assert_equal stages(:copywriting).sequence_order, copywriting_entry["stage"]["sequence_order"]
  end

  test "viewer cannot create a project (FR-22, Edge Case)" do
    assert_no_difference "Project.count" do
      post api_v1_product_projects_path(products(:menopause_guide)), headers: auth_headers(users(:carol))
    end
    assert_response :forbidden
  end

  test "a project belonging to a product the user has zero access to is not reachable (NFR-3, Edge Case)" do
    get api_v1_project_path(projects(:alice_project_one)), headers: auth_headers(users(:dave))
    assert_response :not_found
  end
end
