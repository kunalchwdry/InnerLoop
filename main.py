import json
import database
import user
print("--------------WELCOME TO INNERLOOP--------------")
while True:
    userip=int(input('''
                     1.Profile
                     2.Habits 
                     3.progress 
                     4.View timetable 
                     5.Add Task 
                     6.Add habbit 
                     7.MarkDone 
                     8.Delete 
                     9.Exit 
                     Enter the choice ::== '''))
    if userip==1:
        user.userprofile()
    elif userip==2:
        user.userhabit()
    elif userip==3:
        user.userprogress()
    elif userip==4:
        user.usertimetable()
    elif userip==5:
        user.addtask()
    elif userip==6:
        user.addhabit()
    elif userip==7:
        user.markdone()
    elif userip==8:
        user.Delete()
    elif userip==9:
        user.update()
    else:
        print("==========Exiting The InnerLoop============")
        break