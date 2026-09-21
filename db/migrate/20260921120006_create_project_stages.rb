class CreateProjectStages < ActiveRecord::Migration[8.1]
  def change
    create_table :project_stages, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :project, type: :uuid, null: false, foreign_key: true
      t.references :stage, type: :uuid, null: false, foreign_key: true
      t.integer :status, null: false, default: 0
      t.text :output
      t.datetime :started_at
      t.datetime :completed_at

      t.timestamps
    end

    add_index :project_stages, [ :project_id, :stage_id ], unique: true
  end
end
