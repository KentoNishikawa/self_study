from django.urls import path
from . import views

app_name = "books"

urlpatterns = [
    path("", views.BookListView.as_view(), name="list"),
    path("add/", views.BookCreateView.as_view(), name="add"),
    path("<int:pk>/edit/", views.BookUpdateView.as_view(), name="edit"),
    path("<int:pk>/delete/", views.BookDeleteView.as_view(), name="delete"),
    path("<int:pk>/", views.BookDetailView.as_view(), name="detail"),

    path("<int:pk>/reviews/add/", views.add_review, name="review_add"),
    path("reviews/<int:pk>/edit/", views.ReviewUpdateView.as_view(), name="review_edit"),
    path("reviews/<int:pk>/delete/", views.ReviewDeleteView.as_view(), name="review_delete"),
]
