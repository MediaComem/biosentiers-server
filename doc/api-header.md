* [Authentication](#authentication)
* [Authorization](#authorization)
* [Pagination](#pagination)
* [HTTP Verbs](#http-verbs)



## Authentication

Most API resources require the user to be authenticated, or an `HTTP 401 Unauthorized` response will be sent.

Authentication is done with [JWT](https://jwt.io) tokens.
Before using API resources which require authentication, you must request a token using the [Authentication](#api-Auth-Authenticate) resource:

```
POST /api/v1/auth HTTP/1.1
Content-Type: application/json

{
  "email": "jdoe@example.com",
  "password": "letmein"
}
```

The response will contain a JWT token.
You can then provide this token to other API resources in the **Authorization** header as a **Bearer** token:

```
GET /api/v1/tours HTTP/1.1
Authorization: Bearer eyJhbGciOiJI.eyJzdWIiOiIx.Rq8IxqeX7eA6
```



## Authorization

Not all users have access to all API resources.
When you receive an `HTTP 403 Forbidden` response, it means that you do not have access to that API resource.
You should authenticate with a user account that has more privileges.



## Pagination

Most API resources that return multiple items will be paginated to 30 items by default.
You may select the range of items that are returned with the `offset` and `limit` query parameters:

```
GET /api/v1/pois?offset=20&limit=40
```

The response will always include headers indicating which pagination parameters have been applied,
and also the total number of available items:

```
HTTP/1.1 200 OK
Content-Type: application/json
Pagination-Offset: 0
Pagination-Limit: 30
Pagination-Total: 120
Pagination-Filtered: 45

[
  ... 30 JSON objects
]
```

In this example, this is the meaning of the pagination headers:

* `Pagination-Offset: 0` - the applied offset is 0.
* `Pagination-Limit: 30` - the applied limit is 30.
* `Pagination-Total: 120` - There are 120 available items in total.
* `Pagination-Filtered: 45` - There are 45 available items with the currently applied filters (if no filters are applied, this number will be the same as the total).



## HTTP Verbs

* `POST` is used to create resources.
* `GET` is used for retrieving resources.
* `PATCH` is used to partially or fully update resources.
* `DELETE` is used to delete resources.
