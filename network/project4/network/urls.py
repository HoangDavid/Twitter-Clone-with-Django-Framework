
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    
    # APIs route
    path("upload", views.upload, name="upload"),
    path("posts/<str:post_type>/<str:current_page>", views.posts, name="posts"),
    path("profile/<str:username>/<str:current_page>", views.profile, name="profile"),
    path("follow/<str:username>", views.follow, name="follow"),
    path("edit/<int:post_id>", views.edit, name="edit"),
    path("like/<int:post_id>", views.like, name="like")

]
