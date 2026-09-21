class Api::V1::StagesController < ApplicationController
  include ProductScoped

  def index
    product = find_product
    authorize product, :view?
    render json: product.stages
  end

  def create
    product = find_product
    authorize product, :manage_stages?

    next_sequence = product.stages.maximum(:sequence_order).to_i + 1
    stage = product.stages.build(stage_params.merge(sequence_order: next_sequence))

    if stage.save
      render json: stage, status: :created
    else
      render json: { errors: stage.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    product = find_product
    authorize product, :manage_stages?
    stage = product.stages.find(params[:id])

    if stage.update(stage_params)
      render json: stage
    else
      render json: { errors: stage.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    product = find_product
    authorize product, :manage_stages?
    stage = product.stages.find(params[:id])

    if stage.destroy
      head :ok
    else
      render json: { errors: stage.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def stage_params
    params.require(:stage).permit(:name, :description, :initial_prompt)
  end
end
