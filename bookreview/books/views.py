from django.db.models import Q
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from django.shortcuts import get_object_or_404, redirect

from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin

from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse

from .models import Book, Review
from .forms import BookForm, ReviewForm



class BookListView(ListView):
    model = Book
    template_name = "books/book_list.html"
    context_object_name = "books"
    paginate_by = 20

    def get_queryset(self):
        qs = super().get_queryset().order_by("-id")

        q = self.request.GET.get("q", "").strip()
        year_from = self.request.GET.get("year_from", "").strip()
        year_to = self.request.GET.get("year_to", "").strip()
        rating = self.request.GET.get("rating", "").strip()

        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(author__icontains=q))

        if year_from.isdigit():
            qs = qs.filter(published_year__gte=int(year_from))

        if year_to.isdigit():
            qs = qs.filter(published_year__lte=int(year_to))

        if rating.isdigit():
            qs = qs.filter(reviews__rating=int(rating)).distinct()

        return qs


class BookDetailView(DetailView):
    model = Book
    template_name = "books/book_detail.html"
    context_object_name = "book"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        book = self.object
        context["review_form"] = ReviewForm()
        context["reviews"] = book.reviews.all().order_by("-id")
        return context


class BookCreateView(CreateView):
    model = Book
    form_class = BookForm
    template_name = "books/book_form.html"
    success_url = reverse_lazy("books:list")


class BookUpdateView(UpdateView):
    model = Book
    form_class = BookForm
    template_name = "books/book_form.html"
    success_url = reverse_lazy("books:list")


class BookDeleteView(DeleteView):
    model = Book
    template_name = "books/book_confirm_delete.html"
    success_url = reverse_lazy("books:list")


# ★レビュー投稿：ログイン必須
@login_required
def add_review(request, pk):
    book = get_object_or_404(Book, pk=pk)

    if request.method != "POST":
        return redirect("books:detail", pk=pk)

    form = ReviewForm(request.POST)
    if form.is_valid():
        review = form.save(commit=False)
        review.book = book
        review.user = request.user 
        review.save()

    return redirect("books:detail", pk=pk)


class ReviewUpdateView(LoginRequiredMixin, UpdateView):
    model = Review
    form_class = ReviewForm
    template_name = "books/review_form.html"

    def get_queryset(self):
        # 自分のレビューだけ編集できる
        return Review.objects.filter(user=self.request.user)

    def get_success_url(self):
        # 編集後はその本の詳細へ戻す
        return reverse("books:detail", kwargs={"pk": self.object.book_id})


class ReviewDeleteView(LoginRequiredMixin, DeleteView):
    model = Review
    template_name = "books/review_confirm_delete.html"

    def get_queryset(self):
        # 自分のレビューだけ削除できる
        return Review.objects.filter(user=self.request.user)

    def get_success_url(self):
        return reverse("books:detail", kwargs={"pk": self.object.book_id})

