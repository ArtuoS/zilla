class CreateStages < ActiveRecord::Migration[8.1]
  def change
    create_table :stages, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :product, type: :uuid, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.text :initial_prompt, null: false
      t.integer :sequence_order, null: false

      t.timestamps
    end

    add_index :stages, [ :product_id, :sequence_order ], unique: true
  end
end
