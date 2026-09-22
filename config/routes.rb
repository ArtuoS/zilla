Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"

  namespace :api do
    namespace :v1 do
      resources :registrations, only: [ :create ]
      resource :session, only: [ :create, :destroy ]
      resource :me, only: [ :show ], controller: "me"

      resources :products do
        resources :stages, only: [ :index, :create, :update, :destroy ]
        resources :projects, only: [ :index, :create, :show ]
        resources :permissions, only: [ :index, :create, :update, :destroy ]
      end

      resources :projects, only: [ :show ] do
        resources :project_stages, only: [ :index, :show ] do
          member do
            post :skip
            post :redo
            post :force_advance
          end
          resources :messages, only: [ :index, :create ], controller: "project_messages"
        end
      end
    end
  end
end
