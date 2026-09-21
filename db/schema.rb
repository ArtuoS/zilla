# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_21_120008) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "permissions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "access_level", null: false
    t.datetime "created_at", null: false
    t.uuid "product_id", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["product_id", "user_id"], name: "index_permissions_on_product_id_and_user_id", unique: true
    t.index ["product_id"], name: "index_permissions_on_product_id"
    t.index ["user_id"], name: "index_permissions_on_user_id"
  end

  create_table "products", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id", null: false
    t.index ["user_id"], name: "index_products_on_user_id"
  end

  create_table "project_messages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.uuid "project_id", null: false
    t.uuid "project_stage_id", null: false
    t.integer "sender_type", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id"
    t.index ["project_id"], name: "index_project_messages_on_project_id"
    t.index ["project_stage_id"], name: "index_project_messages_on_project_stage_id"
    t.index ["user_id"], name: "index_project_messages_on_user_id"
  end

  create_table "project_stages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.text "output"
    t.uuid "project_id", null: false
    t.uuid "stage_id", null: false
    t.datetime "started_at"
    t.integer "status", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["project_id", "stage_id"], name: "index_project_stages_on_project_id_and_stage_id", unique: true
    t.index ["project_id"], name: "index_project_stages_on_project_id"
    t.index ["stage_id"], name: "index_project_stages_on_stage_id"
  end

  create_table "projects", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "product_id", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id"], name: "index_projects_on_product_id"
  end

  create_table "stages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "description"
    t.text "initial_prompt", null: false
    t.string "name", null: false
    t.uuid "product_id", null: false
    t.integer "sequence_order", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id", "sequence_order"], name: "index_stages_on_product_id_and_sequence_order", unique: true
    t.index ["product_id"], name: "index_stages_on_product_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "name", null: false
    t.string "password_digest", null: false
    t.string "surname", null: false
    t.datetime "updated_at", null: false
    t.index "lower((email)::text)", name: "index_users_on_lower_email", unique: true
  end

  add_foreign_key "permissions", "products"
  add_foreign_key "permissions", "users"
  add_foreign_key "products", "users"
  add_foreign_key "project_messages", "project_stages"
  add_foreign_key "project_messages", "projects"
  add_foreign_key "project_messages", "users"
  add_foreign_key "project_stages", "projects"
  add_foreign_key "project_stages", "stages"
  add_foreign_key "projects", "products"
  add_foreign_key "stages", "products"
end
