import logging
from .ui import AgentWindow

def main():
    logging.basicConfig(level=logging.INFO)
    AgentWindow().run()

if __name__=="__main__": main()
