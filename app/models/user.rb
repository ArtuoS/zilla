class User < ApplicationRecord
  has_secure_password

  has_many :owned_products, class_name: "Product", foreign_key: :user_id, inverse_of: :owner, dependent: :destroy
  has_many :permissions, dependent: :destroy
  has_many :shared_products, through: :permissions, source: :product
  has_many :project_messages, dependent: :nullify

  before_validation { self.email = email.strip.downcase if email.present? }

  validates :name, :surname, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false },
    format: { with: URI::MailTo::EMAIL_REGEXP }
end
