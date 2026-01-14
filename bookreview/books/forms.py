from django import forms
from .models import Book, Review

class BookForm(forms.ModelForm):
    class Meta:
        model = Book
        fields = ["title", "author", "published_year", "isbn", "description"]
        labels = {
            "title": "タイトル",
            "author": "著者",
            "published_year": "出版年",
            "isbn": "ISBN",
            "description": "概要",
        }

class ReviewForm(forms.ModelForm):
    rating = forms.ChoiceField(
        choices=[(i, f"★{i}") for i in range(1, 6)],
        label="評価",
    )
    # ★text
    text = forms.CharField(
        widget=forms.Textarea(attrs={"rows": 3}),
        required=False,
        label="コメント",
    )

    class Meta:
        model = Review
        fields = ["rating", "text"]
