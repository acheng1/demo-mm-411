#!/usr/local/bin/perl -w
use strict;
use warnings;
no warnings qw(redefine);

use Apache2::Const -compile => qw(OK HTTP_INTERNAL_SERVER_ERROR);
use Apache2::Request ();
use Apache2::RequestRec ();
use Apache2::RequestUtil ();
use Apache2::Response ();
use LWP::UserAgent;
use URI::Escape;

our $R            = shift;
our $APR          = Apache2::Request->new($R);

our $BASE_URL = "https://maps.googleapis.com/maps/api/place/search/json";
our $KEY = "AIzaSyBT0Mvs4zgMm5OjSpaKKrNJYfWDrR-AhEA";

$R->no_cache(1);                  # Send Pragma and Cache-Control headers

# ===========================================================================
# Main body
# ===========================================================================
{
    my ($url, $location, $query);

    $location = $APR->param('location');
    $query = $APR->param('query');

    $url = $BASE_URL . join '&',
               "?location=$location",
               "rankby=distance",
               "sensor=true",
               "name=".uri_escape($query),
               "key=$KEY"; 

    my $ua = LWP::UserAgent->new;
    my $response = $ua->get($url);
    
    if (!$response->is_success) {
        error($response->status_line);
    }

    $R->content_type('application/json');
    $R->print($response->decoded_content);
    return Apache2::Const::OK;
}

sub error {
    my ($err) = @_;
    $R->content_type('text/plain');
    $R->status(Apache2::Const::HTTP_INTERNAL_SERVER_ERROR);
    $R->custom_response(Apache2::Const::HTTP_INTERNAL_SERVER_ERROR, $err);
    return Apache2::Const::OK;
}

