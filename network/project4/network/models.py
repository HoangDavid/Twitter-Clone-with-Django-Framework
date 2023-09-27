from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    pass

class Post(models.Model):
    uploader = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    content = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User)

    def serialize(self):
        return {
            "id": self.id,
            "uploader": self.uploader.username,
            "content": self.content,
            "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p"),
            "likes": self.likes.count()
        }


    def like_count(self):
        return self.likes.count()
    
    def my_content(self):
        return self.content

    def __str__(self):
        return f"post by {self.uploader.username}"



class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="followers", default=None)

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"
