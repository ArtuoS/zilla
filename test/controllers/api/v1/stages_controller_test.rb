require "test_helper"

class Api::V1::StagesControllerTest < ActionDispatch::IntegrationTest
  test "owner creates a stage with a name and initial_prompt (FR-4, Scenario 4)" do
    assert_difference "Stage.count", 1 do
      post api_v1_product_stages_path(products(:menopause_guide)),
        params: { stage: { name: "Editing", initial_prompt: "Edit it." } },
        headers: auth_headers(users(:alice))
    end
    assert_response :created
  end

  test "admin can also create a stage (FR-23)" do
    assert_difference "Stage.count", 1 do
      post api_v1_product_stages_path(products(:menopause_guide)),
        params: { stage: { name: "Editing", initial_prompt: "Edit it." } },
        headers: auth_headers(users(:bob))
    end
    assert_response :created
  end

  test "viewer cannot create a stage (FR-22)" do
    assert_no_difference "Stage.count" do
      post api_v1_product_stages_path(products(:menopause_guide)),
        params: { stage: { name: "Editing", initial_prompt: "Edit it." } },
        headers: auth_headers(users(:carol))
    end
    assert_response :forbidden
  end

  test "rejects a stage without a name or initial_prompt" do
    post api_v1_product_stages_path(products(:menopause_guide)),
      params: { stage: { name: "" } }, headers: auth_headers(users(:alice))
    assert_response :unprocessable_entity
  end

  test "new stages are appended after the existing sequence (FR-5)" do
    post api_v1_product_stages_path(products(:menopause_guide)),
      params: { stage: { name: "Editing", initial_prompt: "Edit it." } },
      headers: auth_headers(users(:alice))
    body = JSON.parse(response.body)
    assert_equal stages(:landing_page).sequence_order + 1, body["sequence_order"]
  end

  test "editing a stage is reflected for every project already using it (FR-17, Scenario 17)" do
    patch api_v1_product_stage_path(products(:menopause_guide), stages(:copywriting)),
      params: { stage: { initial_prompt: "A brand new prompt." } },
      headers: auth_headers(users(:alice))
    assert_response :success

    project_stage = project_stages(:one_copywriting) # belongs to a project already completed on this stage
    assert_equal "A brand new prompt.", project_stage.stage.reload.initial_prompt
  end
end
