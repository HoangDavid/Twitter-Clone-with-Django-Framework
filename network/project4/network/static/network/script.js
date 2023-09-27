function load_view(post_type, current_page){
    $("#profile-info").html("")
    $("#all-posts-view").html("")

    if (post_type == "all"){
        $("#view-title").html("All Posts")
        $("#new-post").css("display", "block")
        $("textarea").val("")
    }else if(post_type == "following"){
        $("#view-title").html("Following")
        $("#new-post").css("display", "none")
    }

    paginator = undefined
    fetch("/posts/" + post_type + "/" + current_page)
    .then(response => response.json())
    .then(posts => {
        output = "";

        for (let i = 0; i < posts.length - 1; i++){
            edit_button = "";
            is_liked = "";
            if (posts[i]["ismypost"]){
                // TODO: add verification for edit in back-end
                edit_button = `
                    <div class="edit-link" data-id="${posts[i]["id"]}">
                        <button class="btn btn-primary btn-sm">Edit</button>
                    </div>
                `
            }

            if (posts[i]["is_liked"]){
                is_liked = `fill`
            }

            output += `
            <div class="post-box">
                <div class="title" onclick="profile('${posts[i]["uploader"]}', 1)">${posts[i]["uploader"]}</div>
                ${edit_button}
                <div class="content">${posts[i]["content"]}</div>
                <div class="timestamp">${posts[i]["timestamp"]}</div>
                <div class="heart-react"><i class="heart-icon ${is_liked}" data-id='${posts[i]["id"]}'></i><p>${posts[i]["likes"]}</p></div>
                <div class="comment">Comment</div>
            </div>
            `
        }
        $("#all-posts-view").html(output)

        // Get the paginator info so to update accordingly
        paginator = posts[posts.length - 1]
    })
    .then(() => {

        // allows uploader to edit their posts
        $(".edit-link button").each(function(){
            $(this).click(function(){
                fetch("/edit/" + $(this).parent().data("id"))
                .then(response => response.json())
                .then(content => {
                    output = `
                    <textarea rows="3">${content["content"]}</textarea>
                    <button class="btn btn-primary btn-sm" data-id="${$(this).parent().data("id")}">Save</button>
                    `
                    element = $(this).parent().next(".content")
                    element.html(output)

                })
                .then(() => {
                    // update the content when click Save
                    element.children("button").click(function(){
                        new_content = element.children("textarea").val()
                        fetch("/edit/" + $(this).data("id"), {
                            method: "POST",
                            body: JSON.stringify({
                                new_content: new_content
                            })
                        })
                        .then(response => response.json())
                        .then(() => {
                            fetch("/edit/" + $(this).data("id"))
                            .then(response => response.json())
                            .then(content => {
                                element.html(content["content"])
                            })
                        })
                    })
                })
            })
        })

        // update posts' likes count
        $(".heart-icon").each(function(){
            $(this).click(function() {
                if ($(this).hasClass("fill")){
                    $(this).removeClass("fill")
                    fetch("/like/" + $(this).data("id"), {
                        method: "PUT",
                        body: JSON.stringify({
                            like: false
                        })
                    })
                    .then(response => response.json())
                    .then(() => {
                        fetch("/like/" + $(this).data("id"))
                        .then(response => response.json())
                        .then(like => {
                            $(this).siblings("p").text(like["like_count"])
                        })
                    })
                }else{
                    $(this).addClass("fill")
                    fetch("/like/" + $(this).data("id"), {
                        method: "PUT",
                        body: JSON.stringify({
                            like: true
                        })
                    })
                    .then(response => response.json())
                    .then(() => {
                        fetch("/like/" + $(this).data("id"))
                        .then(response => response.json())
                        .then(like => {
                            $(this).siblings("p").text(like["like_count"])
                        })
                    })
                }
            })
        })


        // update paginator accordingly

        if (!paginator["has_next"] && !paginator["has_previous"]){
            $("#previous-page").attr("class", "page-item disabled")
            $("#previous-page").off("click")
            
            $("#next-page").attr("class", "page-item disabled")
            $("#next-page").off("click")
        }else if(!paginator["has_next"]){
            $("#previous-page").attr("class", "page-item")
            $("#previous-page").on("click", () => load_view(post_type, current_page - 1))
            
            $("#next-page").attr("class", "page-item disabled")
            $("#next-page").off("click")
        }else if (!paginator["has_previous"]){
            $("#previous-page").attr("class", "page-item disabled")
            $("#previous-page").off("click")
            
            $("#next-page").attr("class", "page-item")
            $("#next-page").on("click", () => load_view(post_type, current_page + 1))
        }else{
            $("#previous-page").attr("class", "page-item")
            $("#previous-page").on("click",  () => load_view(post_type, current_page - 1))
            
            $("#next-page").attr("class", "page-item")
            $("#next-page").on("click",  () => load_view(post_type, current_page + 1))
        }

        output = "";
        for (let i = 1; i <= paginator["total_page"]; i++){
            if (current_page == i){
                output += `
                <li class="page-item active">
                    <a class="page-link">${i}</a>
                </li>
                `;
            }else{
                output += `
                <li class="page-item">
                    <a class="page-link" onclick="load_view('${post_type}', ${i})">${i}</a>
                </li>
                `;
            }
        }

        $("#paginator-view").html(output)
    })
}

function profile(username, current_page){
    paginator = undefined

    fetch("/profile/" + username + "/" + current_page)
    .then(response => response.json())
    .then(profile => {
        $("#view-title").html(profile["username"])
        $("#new-post").css("display", "none")

        follow_button = "";
        edit_button = "";
        if (!profile["ismyprofile"]){
            if (profile["isfollowed"]){
                follow_button = '<button type="button" class="btn btn-primary btn-sm" id="follow-option">Unfollow</button>';
            }else{
                follow_button = '<button type="button" class="btn btn-primary btn-sm" id="follow-option">Follow</button>';
            }
        }else{
            edit_button = '<div class="edit-link"><button type="button" class="btn btn-primary btn-sm">Edit</button></div>';
        }

        profile_info = `
        <div class="followers">Folllowers: ${profile["followers"]}</div>
        <div class="following">Following: ${profile["following"]}</div>
        ${follow_button}
        `;

        $("#profile-info").html(profile_info)

        output = ""
        for (let i = 0; i < profile["posts"].length - 1; i++){
            is_liked = "";
            if (profile["posts"][i]["is_liked"]){
                is_liked = `fill`;
            }
            output += `
            <div class="post-box">
                <div class="title">${profile["posts"][i]["uploader"]}</div>
                ${edit_button}
                <div class="content">${profile["posts"][i]["content"]}</div>
                <div class="timestamp">${profile["posts"][i]["timestamp"]}</div>
                <div class="heart-react"><i class="heart-icon ${is_liked}" data-id='${profile["posts"][i]["id"]}'></i><p>${profile["posts"][i]["likes"]}</p></div>
                <div class="comment">Comment</div>
            </div>
            `;
        }
        $("#all-posts-view").html(output)

        paginator = profile["posts"][profile["posts"].length - 1]
    })
    .then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // update users' following
        $("#follow-option").click(()=>{
            if ($("#follow-option").html() == "Follow"){
                fetch("/follow/" + username, {
                    method: "PUT",
                    body: JSON.stringify({
                        follow: true
                    })
                })
                .then(response => response.json())
                .then(() => {
                    $("#follow-option").html("Unfollow")
                })
            }else{
                fetch("/follow/" + username, {
                    method: "PUT",
                    body: JSON.stringify({
                        follow: false
                    })
                })
                .then(response => response.json())
                .then(() => {
                    $("#follow-option").html("Follow")
                })
            }
        })

        // update likes count
        $(".heart-icon").each(function(){
            $(this).click(function() {
                if ($(this).hasClass("fill")){
                    $(this).removeClass("fill");
                    fetch("/like/" + $(this).data("id"), {
                        method: "PUT",
                        body: JSON.stringify({
                            like: false
                        })
                    })
                    .then(response => response.json())
                    .then(() => {
                        fetch("/like/" + $(this).data("id"))
                        .then(response => response.json())
                        .then(like => {
                            $(this).siblings("p").text(like["like_count"])
                        })
                    })
                }else{
                    $(this).addClass("fill")
                    fetch("/like/" + $(this).data("id"), {
                        method: "PUT",
                        body: JSON.stringify({
                            like: true
                        })
                    })
                    .then(response => response.json())
                    .then(() => {
                        fetch("/like/" + $(this).data("id"))
                        .then(response => response.json())
                        .then(like => {
                            $(this).siblings("p").text(like["like_count"])
                        })
                    })
                }
            })
        })
    }).then(() => {
        // add paginator when enter user profile
        if (!paginator["has_next"] && !paginator["has_previous"]){
            $("#previous-page").attr("class", "page-item disabled")
            $("#previous-page").off("click")
            
            $("#next-page").attr("class", "page-item disabled")
            $("#next-page").off("click")
        }else if(!paginator["has_next"]){
            $("#previous-page").attr("class", "page-item")
            $("#previous-page").on("click", () => load_view(post_type, current_page - 1))
            
            $("#next-page").attr("class", "page-item disabled")
            $("#next-page").off("click")
        }else if (!paginator["has_previous"]){
            $("#previous-page").attr("class", "page-item disabled")
            $("#previous-page").off("click")
            
            $("#next-page").attr("class", "page-item")
            $("#next-page").on("click", () => load_view(post_type, current_page + 1))
        }else{
            $("#previous-page").attr("class", "page-item")
            $("#previous-page").on("click",  () => load_view(post_type, current_page - 1))
            
            $("#next-page").attr("class", "page-item")
            $("#next-page").on("click",  () => load_view(post_type, current_page + 1))
        }

        output = "";
        for (let i = 1; i <= paginator["total_page"]; i++){
            if (current_page == i){
                output += `
                <li class="page-item active">
                    <a class="page-link">${i}</a>
                </li>
                `;
            }else{
                output += `
                <li class="page-item">
                    <a class="page-link" onclick="load_view('${post_type}', ${i})">${i}</a>
                </li>
                `;
            }
        }

        $("#paginator-view").html(output)
    })
}

$(document).ready(function(){
    $("#profile").click(() => {});
    $("#all-posts").click(() => {load_view("all",1)});
    $("#following").click(() => {load_view("following",1)});

    // load the default view
    load_view("all", 1)

    $("#upload-form").on("submit", (e) =>{
        e.preventDefault()
        fetch("/upload", {
            method: 'POST',
            body: JSON.stringify({
                content: $("#upload-content").val()
            })
        })
        .then(response => response.json())
        .then(() => {
            load_view("all", 1)
        })
    })
})