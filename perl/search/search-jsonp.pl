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
use JSON;
use Data::Dumper;

our $R            = shift;
our $APR          = Apache2::Request->new($R);

our $BASE_URL = "https://maps.googleapis.com/maps/api/place/search/json";
our $GEO_URL = "https://maps.googleapis.com/maps/api/geocode/json";
our $KEY = "AIzaSyBT0Mvs4zgMm5OjSpaKKrNJYfWDrR-AhEA";

$R->no_cache(1);                  # Send Pragma and Cache-Control headers

# ===========================================================================
# Main body
# ===========================================================================
{
    my ($url, $location, $query, $cb, $content);

    $location = $APR->param('location');
    $query = $APR->param('query');
    $cb = $APR->param('callback');

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

    my $decoded = decode_json($response->decoded_content);
    # if no results, try geocode api
    if ($decoded && $decoded->{status} eq "ZERO_RESULTS") {
        $url = $GEO_URL . join '&',
                   "?address=".uri_escape($query),
                   "sensor=true";

        $response = $ua->get($url);
        
        if (!$response->is_success) {
            error($response->status_line);
        }
        
        $decoded = decode_json($response->decoded_content);
        if ($decoded && $decoded->{status} eq "OK") {
            foreach my $result (@{$decoded->{results}}) {
                $result->{name} = 'Unnamed location';
                $result->{reference} = 'NONE';
                $result->{formatted_phone_number} = '';
                $result->{website} = '';
                my ($street, $route, $locality, $state) = ("")x4;
                foreach my $component (@{$result->{address_components}}) {
       	            foreach my $type (@{$component->{types}}) {
                        if ($type eq 'street_number') {
                            $street = $component->{short_name};
                        } elsif ($type eq 'route') {
                            $route = $component->{short_name};
                        } elsif ($type eq 'locality') {
                            $locality = $component->{short_name};
                        } elsif ($type eq 'administrative_area_level_1') {
                            $state = $component->{short_name};
                        }
                    }
                    $result->{vicinity} = join ', ', ("$street $route", $locality);
                }
            }
        }
        $content = encode_json($decoded);
    } else {
        $content = $response->decoded_content;
    }

    $R->content_type('application/json');
    if ($cb) {
        $R->print("$cb(" . $content.")");
    } else {
        $R->print($content);
    }
    return Apache2::Const::OK;
}

sub error {
    my ($err) = @_;
    $R->content_type('text/plain');
    $R->status(Apache2::Const::HTTP_INTERNAL_SERVER_ERROR);
    $R->custom_response(Apache2::Const::HTTP_INTERNAL_SERVER_ERROR, $err);
    return Apache2::Const::OK;
}

