from devlock_api.datarepo import repo
from devlock_api.limiter import limiter
from fastapi import APIRouter, Request

router = APIRouter(prefix="/v1", tags=["V1"])


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
async def salt_list(request: Request, skip: int = 0):
    query_result = repo.query(
        """
        SELECT *
        FROM match_salts
        ORDER BY match_id DESC
        LIMIT 1000
        OFFSET %(offset)s
        """,
        {"offset": skip}
    )

    return query_result.named_results()


@router.get("/active-matches")
@limiter.limit("100/minute")
async def active_matches(request: Request, skip: int = 0):
    query_result = repo.query(
        "SELECT * FROM summary_active_matches LIMIT 500 OFFSET %(skip)s", {"skip": skip}
    )
    return query_result.named_results()
