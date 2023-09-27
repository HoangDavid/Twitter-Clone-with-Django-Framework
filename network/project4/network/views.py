import json
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.core.paginator import Paginator

from .models import User, Post, Follow


def index(request):
    return render(request, "network/index.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")

@csrf_exempt
@login_required
def upload(request):
    if request.method != "POST":
        return JsonResponse({"error":"request method has to be POST"}, status=400)
    
    data = json.loads(request.body)
    content = data.get("content")
    print(content)
    
    if content == "" or content == None:
        return JsonResponse({"error":"there has to be content in a post"}, status=400)

    new_post = Post(uploader=request.user, content=content)
    new_post.save()

    return JsonResponse({"message":"post has been uploaded successfully"}, status=201)


@csrf_exempt
@login_required
def posts(request, post_type, current_page):
    if post_type == "all":
        posts = Post.objects.all()
    elif post_type == "following":
        followings = Follow.objects.filter(follower=request.user)

        # since, following field is foreign keys this will return IDs
        # flat=True arg allows it to return lists of IDs ,instead of tuples
        followings = followings.values_list("following", flat=True)
        conditions = [Q(uploader=following) for following in followings]
        query = Q()

        for condition in conditions:
            query |= condition

        if len(conditions) == 0:
            posts = Post.objects.none()
        else:
            posts = Post.objects.filter(query)

    else:
        return JsonResponse({"error": "invalid post type"}, status=400)

    output = []
    posts = posts.order_by("-timestamp")
    p = Paginator(posts, 10)

    for post in p.page(current_page).object_list:
        tmp = post.serialize()
        tmp["ismypost"] = True if request.user.username == tmp["uploader"] else False
        tmp["is_liked"] = True if request.user in post.likes.all() else False
        output.append(tmp)
    
    paginator_info = {}
    paginator_info["total_page"] = p.num_pages
    paginator_info["current_page"] = current_page

    p = p.page(current_page)
    paginator_info["has_next"] = p.has_next()
    paginator_info["has_previous"] = p.has_previous()

    output.append(paginator_info)

    return JsonResponse(output, safe=False)

@login_required
def profile(request, username, current_page):
    if request.method != "GET":
        return JsonResponse({"error":"request method has to be GET"})

    user = User.objects.get(username=username)
    following = Follow.objects.filter(follower=user).count()
    followers = Follow.objects.filter(following=user).count()
    posts = Post.objects.filter(uploader=user)
    ismyprofile = False
    isfollowed = False

    if request.user.username == username:
        ismyprofile = True
    else:
        if Follow.objects.filter(follower=request.user, following=user):
            isfollowed = True

    output = {}
    output["username"] = user.username
    output["following"] = following
    output["followers"] = followers
    output["ismyprofile"] = ismyprofile
    output["isfollowed"] = isfollowed
    output["posts"] = list()
    p = Paginator(posts, 10)

    for post in p.page(current_page).object_list:
        tmp = post.serialize()
        tmp["is_liked"] = True if request.user in post.likes.all() else False
        output["posts"].append(tmp)

    paginator_info = {}
    paginator_info["total_page"] = p.num_pages
    paginator_info["current_page"] = current_page

    p = p.page(current_page)
    paginator_info["has_next"] = p.has_next()
    paginator_info["has_previous"] = p.has_previous()

    output["posts"].append(paginator_info)

    return JsonResponse(output, safe=False)

@login_required
@csrf_exempt
def follow(request, username):
    data = json.loads(request.body)

    if request.method != "PUT":
        return JsonResponse({"error":"request method has to be PUT"}, status=400)

    user = User.objects.get(username=username)
    if data.get("follow"):
        follow = Follow(follower=request.user, following=user)
        follow.save()
    else:
        unfollow = Follow.objects.filter(follower=request.user, following=user)
        unfollow.delete()

    return JsonResponse({"message":"updated follows successfully"})

@login_required
@csrf_exempt
def edit(request, post_id):
    post = Post.objects.get(pk=post_id)
    uploader = post.uploader
    
    if (request.user != uploader):
        return JsonResponse({"message":"unvalid edit request"}, status=400)

    if request.method == "GET":
        return JsonResponse({"content":post.my_content()})
    elif request.method == "POST":
        data = json.loads(request.body)
        post.content = data.get("new_content")
        post.save()

        return JsonResponse({"message":"updated content successfully"})
    else:
        return JsonResponse({"message":"request method has to be GET or POST"})

@login_required
@csrf_exempt
def like(request, post_id):
    if request.method == "PUT":
        data = json.loads(request.body)
        if data.get("like"):
            post = Post.objects.get(pk=post_id)
            post.likes.add(request.user)
            post.save()
        else:
            post = Post.objects.get(pk=post_id)
            post.likes.remove(request.user)
            post.save()
        
        return JsonResponse({"message":"updated likes successfully"})
    elif request.method == "GET":
        post = Post.objects.get(pk=post_id)
        return JsonResponse({"like_count":post.like_count()})
    else:
        return JsonResponse({"message":"request method has to be either PUT or GET"})