from devlock_api.datarepo import repo
from devlock_api.limiter import limiter
from fastapi import APIRouter, Request, Query, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from typing import Optional
from datetime import datetime
from starlette.middleware.sessions import SessionMiddleware
from pysteamsignin.steamsignin import SteamSignIn

router = APIRouter(prefix="/v1", tags=["V1"])

router.add_middleware(SessionMiddleware, secret_key="your-secret-key")

@router.get("/matches")
@limiter.limit("100/minute")
async def match_list(request: Request, skip: int = 0):
    query_result = repo.query(
        "SELECT * FROM match_info LIMIT 20 OFFSET %(offset)s", {"offset": skip}
    )
    return query_result.named_results()


@router.get("/matches/{match_id}/meta")
@limiter.limit("100/minute")
async def match_meta(request: Request, match_id: str):
    query_result = repo.query(
        "SELECT * FROM match_info WHERE match_id = %(match_id)s", {"match_id": match_id}
    )
    return query_result.first_item


@router.get("/salts")
@limiter.limit("100/minute")
async def salt_list(request: Request, skip: int = 0, created_after: Optional[datetime] = Query(None)):
    # Modify the SQL query to include an optional filter for created_at
    query = """
        SELECT *
        FROM match_salts
        WHERE (%(created_after)s IS NULL OR created_at > %(created_after)s)
        ORDER BY match_id DESC
        LIMIT 1000
        OFFSET %(offset)s
    """

    # Execute the query with parameters
    query_result = repo.query(
        query,
        {"offset": skip, "created_after": created_after}
    )

    return query_result.named_results()


@router.get("/active-matches")
@limiter.limit("100/minute")
async def active_matches(request: Request, skip: int = 0):
    query_result = repo.query(
        "SELECT * FROM summary_active_matches LIMIT 500 OFFSET %(skip)s", {"skip": skip}
    )
    return query_result.named_results()

# this is for proof of concept only, in reality it would be more realistic if a webpage button were to redirect to the /processlogin/ endpoint
@router.get('/login/landing')
@limiter.limit("100/minute")
async def main(request: Request, login: bool = None, logout: bool = None):
    if logout:
        request.session.clear()
    steam_id = request.session.get('steam_id')

    if steam_id:
        return HTMLResponse(f'Welcome! Your Steam ID is: {steam_id}. To log out <a href="/?logout=true">click here')
    if login:
        steamLogin = SteamSignIn()
        # Redirect to Steam login URL
        return steamLogin.RedirectUser(steamLogin.ConstructURL(f"{request.base_url}{app.url_path_for('process')}"))

    return HTMLResponse('Click <a href="/?login=true">to log in</a>')

# here we try to validate our session. Sends the user witha temporary redirect to steams login page and then receives the public steam info if it succeeded
# right now I'm not sure if it is properly encoding the information in the session cookie though. it should be handled by the package
@router.get('/login/process')
@limiter.limit("100/minute")
async def process(request: Request, response: Response):
    steamLogin = SteamSignIn()
    steamID = steamLogin.ValidateResults(request.query_params)

    if steamID:
        # Store Steam ID in the session
        request.session['steam_id'] = steamID
        # Redirect to a welcome page or main dashboard
        return RedirectResponse(url='/welcome')
    else:
        return HTMLResponse('Failed to log in, bad details?')

# this also for a proof of concept. We most likely would redirect to an actual page 
@router.get('/login/welcome')
@limiter.limit("100/minute")
async def welcome(request: Request):
    # Retrieve Steam ID from session
    steam_id = request.session.get('steam_id')
    if steam_id:
        return HTMLResponse(f'Welcome! Your Steam ID is: {steam_id}')
    else:
        return RedirectResponse(url='/')  # Redirect to login if no session
