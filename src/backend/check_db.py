from sqlalchemy.orm import Session, joinedload
from models import Base, User, TopicStream, Summary
from database import SessionLocal, engine

def check_db():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Users in database: {len(users)}")
        for user in users:
            print(f"User ID: {user.id}, Email: {user.email}")
        
        streams = db.query(TopicStream).options(joinedload(TopicStream.summaries)).all()
        print(f"\nTopic Streams in database: {len(streams)}")
        for stream in streams:
            print(f"Stream ID: {stream.id}, Query: {stream.query}, User ID: {stream.user_id}")
            
            summaries = stream.summaries
            print(f"  Summaries for this stream: {len(summaries)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
