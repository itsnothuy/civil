# C) System Architecture (continued)

## API Boundaries

* Client ↔ Static: No API; all interactions occur within the browser. Model conversion is manual; annotations are stored locally or as GitHub pull requests.
* Client ↔ Server: When remote storage is used, define REST/GraphQL endpoints for uploading IFC files, requesting conversions, retrieving converted assets, and CRUD operations for annotations/issues. Use JSON Web Tokens for authentication and role-based access.
