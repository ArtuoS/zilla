module ProductScoped
  extend ActiveSupport::Concern

  private

  def find_product
    policy_scope(Product).find(params[:product_id])
  end
end
