def get_internet_time(cls):
        # We need the Moscow time because liveinternet.ru lives in Moscow TZ
        moscow_time = datetime.now(timezone('Europe/Moscow')).date()
        all_visits = InternetTime.objects.filter(date__lt=moscow_time).\
            aggregate(Sum('visits'))['visits__sum'] or .0
        today_visits_count = get_visits_count(moscow_time)
        if today_visits_count > 0:
            (stored_visits, cr) = InternetTime.objects.get_or_create(
                            date=moscow_time)
            stored_visits.visits = today_visits_count
            stored_visits.save()
            # Geting right count of yesterday visits if new day starts
            if cr:
                try:
                    yesterday = moscow_time - timedelta(days=1)
                    yesterday_visits = InternetTime.objects.get(date=yesterday)
                    yesterday_visits_on_site = get_visits_count(yesterday)
                    if yesterday_visits_on_site / cls.internet_minute > yesterday_visits.visits:
                        yesterday_visits.visits = yesterday_visits_on_site
                        yesterday_visits.save()
                except ObjectDoesNotExist:
                    logger.error("There is no yesterday visits in db")
        else:
            logger.error('Wrong day %s' % str(moscow_time))

        return all_visits + float(today_visits_count) / cls.internet_minute
