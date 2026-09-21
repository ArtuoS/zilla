class CreateProjects < ActiveRecord::Migration[8.1]
  def change
    create_table :projects, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :product, type: :uuid, null: false, foreign_key: true

      t.timestamps
    end
  end
end
