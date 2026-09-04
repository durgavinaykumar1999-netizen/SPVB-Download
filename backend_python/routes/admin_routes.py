from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from ..services.mongodb_service import MongoDBService
from ..utils.logger import setup_logger
import jwt
from ..config.env import config

logger = setup_logger()
router = APIRouter(prefix="/api/admin", tags=["admin"])

db = MongoDBService()

# JWT verification function
def verify_admin_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, config.session_secret, algorithms=["HS256"])
        username = payload.get("username")
        if username not in ["admin", "secureadmin2026"]:
            raise HTTPException(status_code=403, detail="Unauthorized")
        return username
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# ============ GAMES ENDPOINTS ============

class GameRequest(BaseModel):
    name: str
    url: str
    thumbnail: Optional[str] = ""

class AdminLoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def admin_login(request: AdminLoginRequest):
    """Login endpoint - returns JWT token"""
    if request.username == "admin" and request.password == "admin123":
        token = jwt.encode(
            {"username": request.username},
            config.session_secret,
            algorithm="HS256"
        )
        return {"success": True, "token": token}
    elif request.username == "admin" and request.password == "secureadmin2026":
        token = jwt.encode(
            {"username": "secureadmin2026"},
            config.session_secret,
            algorithm="HS256"
        )
        return {"success": True, "token": token}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/games/add")
async def add_game(request: GameRequest, username: str = Depends(verify_admin_token)):
    """Add a new game"""
    try:
        db._ensure_connected()
        from datetime import datetime
        game = {
            "id": f"game-{abs(hash(request.name + request.url)) % 1000000}",
            "name": request.name,
            "url": request.url,
            "thumbnail": request.thumbnail or "",
            "createdAt": datetime.utcnow().isoformat(),
            "plays": 0,
            "downloads": 0
        }
        db.games.insert_one(game)
        game_response = game.copy()
        game_response.pop("_id", None)
        return {"success": True, "gameId": game["id"], "game": game_response}
    except Exception as e:
        logger.error(f"Failed to add game: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add game: {str(e)}")

@router.get("/games")
async def get_admin_games(username: str = Depends(verify_admin_token)):
    """Get all games (admin view)"""
    try:
        db._ensure_connected()
        games = list(db.games.find({}))
        for game in games:
            game.pop("_id", None)
        return {"success": True, "games": games}
    except Exception as e:
        logger.error(f"Failed to fetch games: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch games: {str(e)}")

@router.delete("/games/{game_id}")
async def delete_game(game_id: str, username: str = Depends(verify_admin_token)):
    """Delete a game"""
    try:
        db._ensure_connected()
        result = db.games.delete_one({"id": game_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Game not found")
        return {"success": True, "message": "Game deleted"}
    except Exception as e:
        logger.error(f"Failed to delete game: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete game: {str(e)}")

# ============ MOVIES ENDPOINTS ============

class MovieRequest(BaseModel):
    name: str
    url: str
    thumbnail: Optional[str] = ""

@router.post("/movies/add")
async def add_movie(request: MovieRequest, username: str = Depends(verify_admin_token)):
    """Add a new movie"""
    try:
        db._ensure_connected()
        from datetime import datetime
        movie = {
            "id": f"movie-{abs(hash(request.name + request.url)) % 1000000}",
            "name": request.name,
            "url": request.url,
            "thumbnail": request.thumbnail or "",
            "createdAt": datetime.utcnow().isoformat(),
            "plays": 0
        }
        db.movies.insert_one(movie)
        movie_response = movie.copy()
        movie_response.pop("_id", None)
        return {"success": True, "movieId": movie["id"], "movie": movie_response}
    except Exception as e:
        logger.error(f"Failed to add movie: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add movie: {str(e)}")

@router.get("/movies")
async def get_admin_movies(username: str = Depends(verify_admin_token)):
    """Get all movies (admin view)"""
    try:
        db._ensure_connected()
        movies = list(db.movies.find({}))
        for movie in movies:
            movie.pop("_id", None)
        return {"success": True, "movies": movies}
    except Exception as e:
        logger.error(f"Failed to fetch movies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch movies: {str(e)}")

@router.delete("/movies/{movie_id}")
async def delete_movie(movie_id: str, username: str = Depends(verify_admin_token)):
    """Delete a movie"""
    try:
        db._ensure_connected()
        result = db.movies.delete_one({"id": movie_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Movie not found")
        return {"success": True, "message": "Movie deleted"}
    except Exception as e:
        logger.error(f"Failed to delete movie: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete movie: {str(e)}")

# ============ STATS ENDPOINT ============

@router.get("/stats")
async def get_stats(username: str = Depends(verify_admin_token)):
    """Get admin stats"""
    try:
        db._ensure_connected()
        games = list(db.games.find({}))
        movies = list(db.movies.find({}))
        downloads = list(db.downloads.find({}))

        return {
            "success": True,
            "totalGames": len(games),
            "totalMovies": len(movies),
            "totalDownloads": len(downloads)
        }
    except Exception as e:
        logger.error(f"Failed to fetch stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")
