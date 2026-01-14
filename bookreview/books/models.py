from django.conf import settings
from django.db import models


class Book(models.Model):
    # ※ここはあなたの今の定義に合わせてOK（例として一般的な形）
    title = models.CharField("タイトル", max_length=200)
    author = models.CharField("著者", max_length=200)
    isbn = models.CharField("ISBN", max_length=13, blank=True)
    published_year = models.IntegerField("出版年", null=True, blank=True)

    created_at = models.DateTimeField("作成日時", auto_now_add=True)
    updated_at = models.DateTimeField("更新日時", auto_now=True)

    def __str__(self) -> str:
        return self.title


class Review(models.Model):
    book = models.ForeignKey(
        Book,
        related_name="reviews",
        on_delete=models.CASCADE,
        verbose_name="対象の本",
    )

    # ★追加：投稿者（ログインユーザー）
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="reviews",
        on_delete=models.CASCADE,
        verbose_name="投稿者",
        null=True,   # 既存データがある場合に migration を通すため
        blank=True,
    )

    rating = models.IntegerField("評価")  # 1〜5想定（フォーム側で制限）
    comment = models.TextField("コメント", blank=True)

    created_at = models.DateTimeField("作成日時", auto_now_add=True)
    updated_at = models.DateTimeField("更新日時", auto_now=True)

    def __str__(self) -> str:
        return f"{self.book.title} / ★{self.rating}"
