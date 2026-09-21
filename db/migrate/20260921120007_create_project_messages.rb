class CreateProjectMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :project_messages, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :project, type: :uuid, null: false, foreign_key: true
      t.references :project_stage, type: :uuid, null: false, foreign_key: true
      t.integer :sender_type, null: false
      t.references :user, type: :uuid, null: true, foreign_key: true
      t.text :content, null: false

      t.timestamps
    end
  end
end
